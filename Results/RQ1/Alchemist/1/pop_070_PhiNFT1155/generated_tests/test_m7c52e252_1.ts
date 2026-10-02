import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m7c52e252 - whenNotPaused removal", function () {
  it("should revert claimFromFactory when contract is paused (original has whenNotPaused, mutant does not)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // We need a PhiFactory contract to test claimFromFactory since it has onlyPhiFactory modifier
    // Deploy a mock PhiFactory or use the actual one
    const PhiFactory = await ethers.getContractFactory("IPhiFactory");
    // For testing, we'll deploy a simple mock that can be set as phiFactoryContract
    // Since we need to call initialize first to set up the contract
    
    // Initialize the contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // Get the phiFactoryContract address from the instance
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // Pause the contract
    await instance.pause();
    
    // Now try to call claimFromFactory - it should revert when paused on original
    // but may succeed on mutant (which removes whenNotPaused)
    const artId = 1;
    const minter = addr1.address;
    const ref = ethers.ZeroAddress;
    const verifier = ethers.ZeroAddress;
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "ipfs://test";
    
    // We need to call from the phiFactory address since it has onlyPhiFactory modifier
    // Impersonate the phiFactory contract
    await ethers.provider.send("hardhat_impersonateAccount", [phiFactoryAddress]);
    const phiFactorySigner = await ethers.getSigner(phiFactoryAddress);
    
    // Fund the phiFactory signer with some ETH for the call
    await owner.sendTransaction({
      to: phiFactoryAddress,
      value: ethers.parseEther("1")
    });
    
    // The original contract should revert when paused
    // The mutant (without whenNotPaused) may not revert
    // We expect the call to revert on the original
    await expect(
      instance.connect(phiFactorySigner).claimFromFactory(
        artId,
        minter,
        ref,
        verifier,
        quantity,
        data,
        imageURI
      )
    ).to.be.reverted;
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [phiFactoryAddress]);
  });
});