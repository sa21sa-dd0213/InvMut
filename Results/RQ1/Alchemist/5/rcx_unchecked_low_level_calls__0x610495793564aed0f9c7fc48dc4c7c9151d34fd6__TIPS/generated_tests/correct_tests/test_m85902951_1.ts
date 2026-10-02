import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls onlyOwner functions (mutant: onlyOwner uses != instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test that non-owner cannot call withdrawAll (should revert in original, but mutant allows it)
    // This will detect the mutant because in the mutant, non-owner calls will succeed instead of reverting
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;

    // Test that owner can call withdrawAll (should succeed in original, but mutant reverts)
    // This will detect the mutant because in the mutant, owner calls will revert instead of succeeding
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});