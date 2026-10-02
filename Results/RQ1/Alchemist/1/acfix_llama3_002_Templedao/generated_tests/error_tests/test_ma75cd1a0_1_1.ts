import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant ma75cd1a0 test", function () {
  it("should revert when non-owner calls setMigrator", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with constructor arguments: stakingToken and distributor
    // Use a mock token address for stakingToken and any address for distributor
    const mockToken = ethers.Wallet.createRandom().address;
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(mockToken, owner.address);
    await instance.waitForDeployment();

    // Attempt to call setMigrator from a non-owner address
    // This should revert in the original contract due to onlyOwner modifier
    // In the mutant (without modifier), it would succeed, thus killing the mutant
    await expect(
      instance.connect(addr1).setMigrator(addr1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});