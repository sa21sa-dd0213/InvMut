import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken mutant kill test - mb18f934c", function () {
  it("should revert when transferring non-zero amount due to mutated overflow check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000", 0); // decimals = 0
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "Test", "TST");
    await instance.waitForDeployment();

    // Fund addr1 with some tokens first via mintToken (onlyOwner)
    await instance.connect(owner).mintToken(addr1.address, ethers.parseUnits("100", 0));

    // Attempt to transfer a non-zero amount from addr1 to owner
    // The mutant requires (balanceOf[_to] + _value == balanceOf[_to])
    // This only holds when _value == 0, so any non-zero transfer will revert
    await expect(
      instance.connect(addr1).transfer(owner.address, ethers.parseUnits("1", 0))
    ).to.be.reverted;

    // Also verify that a zero-value transfer would succeed (original logic)
    // This confirms the mutant's specific failure
    await expect(
      instance.connect(addr1).transfer(owner.address, 0)
    ).to.not.be.reverted;
  });
});