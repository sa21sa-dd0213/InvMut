import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test", function () {
  it("should kill mutant mc652e742 by depositing non-zero value and expecting success on original", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call Deposit with a non-zero value (1 wei)
    // Original contract: require((balance + msg.value) >= balance) passes for any positive msg.value
    // Mutant: require((balance + msg.value) == balance) only passes when msg.value == 0
    // So a non-zero deposit should succeed on original but fail on mutant
    const tx = instance.connect(owner).Deposit({ value: ethers.parseEther("1") });
    
    // The test expects the transaction to succeed (not revert)
    // On the mutant this will revert, thus killing the mutant
    await expect(tx).to.not.be.reverted;
  });
});