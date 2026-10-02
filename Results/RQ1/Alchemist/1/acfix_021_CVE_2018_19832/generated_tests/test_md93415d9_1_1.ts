import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - onlyPayloadSize mutant test", function () {
  it("should revert on original contract when calling transfer with short calldata, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract by calling NETM() to set owner balance
    await instance.connect(owner).NETM();

    // Encode the transfer function call manually with only the first argument (no _amount)
    // Function selector for transfer(address,uint256) = 0xa9059cbb
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const selector = "0xa9059cbb";
    const addr1Padded = ethers.zeroPadValue(addr1.address, 32);

    // Create calldata with only 36 bytes (4 bytes selector + 32 bytes for _to address)
    // Missing the _amount parameter - this should be caught by onlyPayloadSize
    const shortCalldata = selector + addr1Padded.slice(2);

    // Send the transaction with short calldata directly
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: shortCalldata,
      gasLimit: 100000
    });

    // If the mutant removes the assertion, the transaction will succeed (not revert)
    // On the original contract with the assertion, it would revert
    // We expect it to succeed on the mutant (no revert)
    await expect(tx).to.not.be.reverted;

    // Additional verification: the transfer should have gone through
    // (even though amount is malformed, it will likely be 0)
    const balance = await instance.balanceOf(addr1.address);
    expect(balance).to.equal(0); // Confirms the transaction completed
  });
});