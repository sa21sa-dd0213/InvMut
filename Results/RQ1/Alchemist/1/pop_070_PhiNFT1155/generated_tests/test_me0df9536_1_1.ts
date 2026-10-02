import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant detection - me0df9536", function () {
  it("should detect the mutant that changes credChainId == block.chainid to credChainId >= block.chainid", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts first
    const MockPhiRewards = await ethers.getContractFactory("MockPhiRewards");
    const mockRewards = await MockPhiRewards.deploy();
    await mockRewards.waitForDeployment();
    
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Set rewards address in mock factory
    await mockFactory.setPhiRewardsAddress(mockRewards.getAddress());
    await mockFactory.setProtocolFeeDestination(addr1.address);
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();
    
    // Get current chain ID
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    
    // Set credChainId GREATER than current chain ID to trigger the mutant
    const credChainId = Number(chainId) + 100;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = addr1.address;
    
    // Initialize the NFT through the mock factory (so phiFactoryContract is set correctly)
    await mockFactory.initializeNFT(instanceAddress, credChainId, credId, verificationType, protocolFeeDest);
    
    // Verify initialization
    expect(await instance.credChainId()).to.equal(credChainId);
    expect(await instance.credId()).to.equal(credId);
    
    // Configure mock factory art data
    const artId = 1;
    const tokenId = 1;
    const artist = owner.address;
    const receiver = addr1.address;
    const maxSupply = 100;
    const mintFee = ethers.parseEther("0.01");
    const startTime = 0;
    const endTime = 2000000000;
    const soulBounded = false;
    const credCreator = owner.address;
    
    await mockFactory.setArtData(artId, {
      credId: credId,
      credCreator: credCreator,
      credChainId: credChainId,
      verificationType: verificationType,
      uri: "https://example.com/token/1",
      artAddress: instanceAddress,
      tokenId: tokenId,
      artist: artist,
      receiver: receiver,
      royalties: { royaltyBPS: 500, royaltyRecipient: receiver },
      maxSupply: maxSupply,
      mintFee: mintFee,
      startTime: startTime,
      endTime: endTime,
      numberMinted: 0,
      soulBounded: soulBounded
    });
    
    await mockFactory.setArtCreateFee(ethers.parseEther("0.001"));
    
    // Create art from factory
    await mockFactory.createArt(instanceAddress, artId, { value: ethers.parseEther("0.001") });
    
    // Now test claimFromFactory
    const minter = addr1.address;
    const ref = ethers.ZeroAddress;
    const verifier = ethers.ZeroAddress;
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "https://example.com/image.jpg";
    
    // Fund the factory with enough ETH
    await owner.sendTransaction({
      to: await mockFactory.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Call claimFromFactory through the mock factory
    const claimFee = mintFee + ethers.parseEther("0.001");
    
    await mockFactory.claimFromFactory(
      instanceAddress,
      artId,
      minter,
      ref,
      verifier,
      quantity,
      data,
      imageURI,
      { value: claimFee }
    );
    
    // Check if the mint happened
    const balance = await instance.balanceOf(minter, tokenId);
    expect(balance).to.equal(quantity);
    
    // Check the chainSync parameter that was passed to handleRewardsAndGetValueSent
    // In the mutant (credChainId >= block.chainid), chainSync should be true
    // In the original (credChainId == block.chainid), chainSync should be false
    const lastChainSync = await mockRewards.lastChainSync();
    expect(lastChainSync).to.equal(true);
  });
});

// Helper contracts need to be deployed as separate contracts
// These are defined as Solidity contracts that will be compiled