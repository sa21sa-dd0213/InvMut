import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1f4921f5 - kill test", function () {
  it("should revert when called from an address lower than the authorized address", async function () {
    const [owner, unauthorizedLower] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get a lower address than the authorized one (0x9797...)
    // unauthorizedLower is a signer with a randomly generated address that is likely lower
    // but to ensure it's lower, we can use a specific deterministic address
    const lowerAddress = "0x0000000000000000000000000000000000000001";
    
    // We need a signer for this lower address - use impersonation or create a wallet
    // Since we can't create a signer for an arbitrary address in hardhat easily,
    // we'll use ethers.Wallet with a known private key for a low address
    const lowerWallet = new ethers.Wallet("0x0000000000000000000000000000000000000000000000000000000000000001", ethers.provider);
    
    const tos = [owner.address];
    const values = [1];
    
    // The transaction should revert because lowerAddress is not exactly equal to the authorized address
    await expect(
      instance.connect(lowerWallet).transfer(tos, values)
    ).to.be.reverted;
  });
});