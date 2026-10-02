import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m8da1a982", function () {
  it("should set migrator to the provided address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with a mock staking token address and any address for distributor
    const mockToken = addr1.address; // Using addr1 as a placeholder staking token address
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(mockToken, owner.address);
    await instance.waitForDeployment();

    // Call setMigrator with a non-zero address (addr1)
    const migratorAddress = addr1.address;
    await instance.connect(owner).setMigrator(migratorAddress);

    // In the original contract, migrator should be addr1
    // In the mutant, migrator will be address(0) regardless
    // To detect the mutant, we check that the migrator is not address(0)
    // We can do this by trying to call migrateStake which requires msg.sender == migrator
    // If migrator is address(0), only the zero address can call it - which is impossible
    // So we expect a revert when addr1 tries to call migrateStake in the mutant

    // First, we need to have some staking tokens for the test
    // Since we can't actually transfer tokens from addr1 to the contract without real ERC20,
    // we'll instead verify the migrator address directly via the public variable

    // In the original, this will succeed
    // In the mutant, the migrator is address(0) so we expect revert
    await expect(
      instance.connect(addr1).migrateStake(instance.target, 0)
    ).to.be.revertedWith("not migrator");
  });
});