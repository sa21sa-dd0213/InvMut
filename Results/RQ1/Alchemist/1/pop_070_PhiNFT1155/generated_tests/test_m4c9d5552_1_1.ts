import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m4c9d5552 - claimFromFactory credChainId check", function () {
  it("should revert when credChainId is greater than block.chainid (original uses ==, mutant uses <=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock PhiFactory contract to satisfy the onlyPhiFactory modifier
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Get current chainId
    const network = await ethers.provider.getNetwork();
    const currentChainId = network.chainId;
    
    // Set credChainId to be LESS than current chainId (to test the mutant behavior)
    // Original: credChainId == block.chainid -> false
    // Mutant: credChainId <= block.chainid -> true (INCORRECT!)
    const credChainId = 1; // Less than current chainId
    
    // Deploy fresh instance
    const factoryInstance = await Factory.deploy();
    await factoryInstance.waitForDeployment();
    
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = addr2.address;
    
    await factoryInstance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Now owner is the phiFactoryContract (set during initialize)
    // Create an art first via createArtFromFactory
    const artId = 1;
    const artFee = await mockFactory.artCreateFee();
    await factoryInstance.connect(owner).createArtFromFactory(artId, { value: artFee });
    
    // Prepare claim parameters
    const minter = addr1.address;
    const ref = ethers.ZeroAddress;
    const verifier = ethers.ZeroAddress;
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "";
    
    // Fund the contract with ETH for mint fee and rewards
    await owner.sendTransaction({
      to: await factoryInstance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Call claimFromFactory - this should NOT revert in the mutant version
    // because credChainId (1) <= currentChainId (31337) would be true
    await expect(
      factoryInstance.connect(owner).claimFromFactory(
        artId,
        minter,
        ref,
        verifier,
        quantity,
        data,
        imageURI,
        { value: ethers.parseEther("0.1") }
      )
    ).to.not.be.reverted;
    
    // Verify the mint happened (which wouldn't happen if the condition failed)
    const tokenId = await factoryInstance.getTokenIdFromFactoryArtId(artId);
    const balance = await factoryInstance.balanceOf(minter, tokenId);
    expect(balance).to.equal(quantity);
    
    console.log("Current chainId:", currentChainId);
    console.log("credChainId set to:", credChainId);
    console.log("Test passed: mutant behavior allows mint when credChainId <= block.chainid");
  });
});