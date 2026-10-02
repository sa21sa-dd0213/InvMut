import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m51cb43c0 kill test", function () {
  it("should kill the mutant by burning exact balance (expect revert on mutant)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with initial supply of 1000 tokens (decimals = 0)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TST");
    await instance.waitForDeployment();

    // Get owner's balance (should be 1000 tokens)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(1000n);

    // Attempt to burn the exact balance (1000 tokens)
    // Original: require(balanceOf[msg.sender] >= _value) - should pass
    // Mutant: require(balanceOf[msg.sender] > _value) - should revert
    const tx = instance.burn(1000);

    // This transaction should revert on the mutant due to strict > check
    // while passing on the original contract
    await expect(tx).to.be.reverted;
  });
});