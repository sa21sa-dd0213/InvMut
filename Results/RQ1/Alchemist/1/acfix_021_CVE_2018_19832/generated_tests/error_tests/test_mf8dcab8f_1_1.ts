import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mf8dcab8f by calling transferFrom with a calldata length between 39 and 99 bytes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set up balances and approvals to allow a transferFrom call
    // Give addr1 some tokens via getTokens (triggered by sending value)
    const value = ethers.parseEther("2500");
    await owner.sendTransaction({ to: await instance.getAddress(), value });

    // Now addr1 has tokens, approve addr2 to spend them
    const instanceAddr1 = instance.connect(addr1);
    const approveAmount = ethers.parseEther("100");
    await instanceAddr1.approve(addr2.address, approveAmount);

    // Build a transferFrom call with calldata length between 39 and 99 bytes
    // The standard transferFrom has 4 bytes selector + 96 bytes data = 100 bytes
    // We'll create a call with only 2 parameters (68 bytes total) which is < 100 bytes
    
    const iface = new ethers.Interface([
      "function transferFrom(address from, address to, uint256 amount)"
    ]);

    const selector = iface.getFunction("transferFrom").selector;
    
    // Encode with only 2 parameters (missing the _amount parameter) = 68 bytes
    const shortEncoded = selector + 
      ethers.zeroPadValue(addr1.address, 32).slice(2) + 
      ethers.zeroPadValue(addr2.address, 32).slice(2);
    // This gives us 4 + 64 = 68 bytes of calldata

    // Execute the raw call with short calldata
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        data: shortEncoded
      })
    ).to.be.reverted; // Should revert on original (calldata < 100 bytes) but pass on mutant
  });
});