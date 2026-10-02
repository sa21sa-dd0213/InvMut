import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m8c79723d test", function () {
  it("should kill the mutant by calling onlyCaller function with address > cfo", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr2.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the CFO (caller) to addr1
    await instance.setCaller(addr1.address);

    // Get a signer whose address is numerically greater than addr1
    // We'll use addr2, but we need to ensure addr2 > addr1 numerically
    // If not, we can use a different approach - create a wallet with higher address
    let higherAddress = addr2;

    // Check if addr2 > addr1 numerically, if not create a new wallet
    if (addr2.address.toLowerCase() <= addr1.address.toLowerCase()) {
      // Create a deterministic wallet with a higher address
      let higherWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      // Keep trying until we get an address > addr1
      while (higherWallet.address.toLowerCase() <= addr1.address.toLowerCase()) {
        const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
        higherWallet = newWallet;
      }
      higherAddress = higherWallet;
    }

    // Try to call distributeToken() from the higher address (not the CFO)
    // In original: should revert because msg.sender != cfo
    // In mutant: should succeed because msg.sender >= cfo
    await expect(
      instance.connect(higherAddress).distributeToken()
    ).to.be.revertedWith("onlyCaller");
  });
});