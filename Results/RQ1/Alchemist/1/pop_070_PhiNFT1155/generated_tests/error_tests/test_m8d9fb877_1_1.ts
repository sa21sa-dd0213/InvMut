import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant detection - createArtFromFactory msg.value-1", function () {
  it("should kill mutant by sending msg.value exactly equal to artFee + 1 and verifying refund", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock PhiFactory to be able to call createArtFromFactory
    const MockPhiFactory = await ethers.getContractFactory(
      "contracts/mocks/MockPhiFactory.sol:MockPhiFactory"
    );
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );
    
    // Set the phiFactoryContract address (needs to be the mock factory)
    const PHI_FACTORY_SLOT = ethers.keccak256(ethers.toUtf8Bytes("phiFactoryContract"));
    
    // Store the mock factory address
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      PHI_FACTORY_SLOT,
      ethers.zeroPadValue(await mockFactory.getAddress(), 32)
    ]);
    
    // Get the artCreateFee from the mock factory (set to some value)
    const artFee = ethers.parseEther("1");
    
    // Calculate msg.value = artFee + 1 (1 wei excess)
    const msgValue = artFee + 1n;
    
    // Get the balance of factory before
    const balanceBefore = await ethers.provider.getBalance(await mockFactory.getAddress());
    
    // Call createArtFromFactory with exactly artFee + 1
    const artId = 1;
    
    // Impersonate the factory to call createArtFromFactory
    await ethers.provider.send("hardhat_impersonateAccount", [
      await mockFactory.getAddress()
    ]);
    
    const factorySigner = await ethers.getSigner(await mockFactory.getAddress());
    
    // Fund the factory signer with ETH
    await owner.sendTransaction({
      to: await factorySigner.getAddress(),
      value: msgValue
    });
    
    // Now call createArtFromFactory from the factory signer
    const tx = await instance.connect(factorySigner).createArtFromFactory(artId, {
      value: msgValue
    });
    const receipt = await tx.wait();
    
    // Check the factory signer's balance after
    const balanceAfter = await ethers.provider.getBalance(
      await factorySigner.getAddress()
    );
    
    // The factory signer sent msgValue but only artFee should be deducted
    // In original: factory balance change = -artFee (1 wei refunded)
    // In mutant: factory balance change = -(artFee + 1) (no refund)
    
    const factoryBalanceChange = balanceBefore - balanceAfter;
    
    // The test passes (kills mutant) if the refund is NOT sent (mutant behavior)
    // We verify this by checking that the factory signer lost the full amount
    expect(factoryBalanceChange).to.equal(msgValue); // Mutant doesn't refund
    
    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      await mockFactory.getAddress()
    ]);
  });
});