import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant mc21578b1", function () {
  it("should detect removal of onlyPayloadSize modifier in transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Setup: Owner approves addr1 to spend tokens on his behalf
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, approveAmount);

    // Setup: Transfer some tokens to addr2 so addr2 has balance to transfer
    const transferAmount = ethers.parseEther("50");
    await instance.connect(owner).transfer(addr2.address, transferAmount);

    // Create malformed calldata for transferFrom that is shorter than expected (3*32+4 = 100 bytes)
    // The original modifier requires msg.data.length >= 100 bytes
    // We'll craft a call with only 68 bytes (function selector + 2 parameters instead of 3)
    const transferFromSelector = ethers.id("transferFrom(address,address,uint256)").slice(0, 10);
    
    // Encode only 2 parameters (missing the _amount parameter)
    const malformedCalldata = transferFromSelector + 
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address"],
        [addr2.address, owner.address]
      ).slice(2); // Remove 0x prefix

    // Send the malformed transaction manually
    const tx = await owner.sendTransaction({
      to: contractAddress,
      data: malformedCalldata,
      gasLimit: 100000
    });

    // The transaction should NOT revert on the mutant (since onlyPayloadSize modifier is removed)
    // If it reverts, it means the original contract is still in place and the test fails
    await expect(tx).to.not.be.reverted;
    
    // Additionally, verify that the state was NOT modified (since the malformed call shouldn't execute properly)
    // If the mutant exists, the function will execute with garbage data for _amount
    // This could potentially modify state, so we check balances haven't changed unexpectedly
    const addr2Balance = await instance.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(transferAmount); // addr2 should still have the full amount
  });
});