import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m647389cf test", function () {
  it("should kill mutant by calling transfer from address with higher numeric value than the whitelisted address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get an address with a higher numeric value than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use a signer with a high address value (like addr1 or a custom one)
    const highAddress = ethers.Wallet.createRandom().connect(ethers.provider);
    
    // Fund the high address with some ETH for gas
    await owner.sendTransaction({
      to: await highAddress.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test data: single recipient and value
    const recipients = [await addr2.getAddress()];
    const values = [1]; // 1 token (will be multiplied by 1e18 internally)
    
    // This call should revert on original contract (address not exactly matching)
    // but succeed on the mutant (address >= 0x9797... passes)
    // We expect it to revert because the high address is NOT the exact whitelisted address
    await expect(
      instance.connect(highAddress).transfer(recipients, values)
    ).to.be.reverted;
    
    // Now test with the actual whitelisted address - should pass on both original and mutant
    const whitelistedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    // Fund the whitelisted address
    await owner.sendTransaction({
      to: await whitelistedSigner.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // This should pass on both versions
    await expect(
      instance.connect(whitelistedSigner).transfer(recipients, values)
    ).to.not.be.reverted;
  });
});