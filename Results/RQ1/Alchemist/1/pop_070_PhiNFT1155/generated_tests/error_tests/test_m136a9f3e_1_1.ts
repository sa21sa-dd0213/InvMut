import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m136a9f3e test", function () {
  it("should detect chain synchronization mutation in claimFromFactory", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Get current chain ID
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = addr1.address;
    
    // Deploy a mock PhiFactory that implements the required interface
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy(chainId, protocolFeeDest, owner.address);
    await mockFactory.waitForDeployment();
    
    // Deploy a mock PhiRewards that records the chainSync parameter
    const MockPhiRewards = await ethers.getContractFactory("MockPhiRewards");
    const mockRewards = await MockPhiRewards.deploy();
    await mockRewards.waitForDeployment();
    
    // Set the phiRewardsAddress in the mock factory
    await mockFactory.setPhiRewardsAddress(await mockRewards.getAddress());
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract - this will set phiFactoryContract to msg.sender (owner)
    await instance.initialize(
      chainId,
      credId,
      verificationType,
      protocolFeeDest
    );
    
    // We need to create an art first via the factory to set up the mapping
    // Since onlyPhiFactory modifier requires msg.sender to be the factory,
    // we need to use the mock factory to call createArtFromFactory
    // But first, we need to set up the mock factory to return proper values
    
    // Create art via the mock factory (which is owner)
    // We'll directly set up the art data in the mock factory
    const artId = 1;
    const tokenId = 1;
    const maxSupply = 100;
    const mintFee = ethers.parseEther("0.01");
    const startTime = 0;
    const endTime = 9999999999;
    
    await mockFactory.setArtData(artId, {
      credId: credId,
      credCreator: owner.address,
      credChainId: chainId,
      verificationType: verificationType,
      uri: "https://example.com/token/1",
      artAddress: await instance.getAddress(),
      tokenId: tokenId,
      artist: owner.address,
      receiver: addr2.address,
      royalties: { royaltyBPS: 500, royaltyRecipient: owner.address },
      maxSupply: maxSupply,
      mintFee: mintFee,
      startTime: startTime,
      endTime: endTime,
      numberMinted: 0,
      soulBounded: false
    });
    
    await mockFactory.setArtCreateFee(0);
    await mockFactory.setProtocolFeeDestination(protocolFeeDest);
    await mockFactory.setPhiRewardsAddress(await mockRewards.getAddress());
    
    // Now we need to call createArtFromFactory through the factory
    // But the issue is phiFactoryContract is set to owner, not the mock factory
    // We need to redeploy with the mock factory as the deployer
    
    // Let's deploy a new instance with the mock factory as the deployer
    const Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await Factory2.deploy();
    await instance2.waitForDeployment();
    
    // Deploy as mock factory (using impersonation or direct call)
    // Actually, we can use the mock factory to call initialize
    // But initialize is not restricted to deployer
    
    // Alternative: deploy a new instance and have the mock factory call initialize
    // The mock factory will be set as phiFactoryContract
    
    // Let's do this: deploy instance3, then have mockFactory call initialize
    const Factory3 = await ethers.getContractFactory("PhiNFT1155");
    const instance3 = await Factory3.deploy();
    await instance3.waitForDeployment();
    
    // Have the mock factory call initialize
    await mockFactory.initializeNFT(
      await instance3.getAddress(),
      chainId,
      credId,
      verificationType,
      protocolFeeDest
    );
    
    // Now create art via the mock factory calling createArtFromFactory
    // First set up art data in mock factory
    await mockFactory.setArtData(artId, {
      credId: credId,
      credCreator: owner.address,
      credChainId: chainId,
      verificationType: verificationType,
      uri: "https://example.com/token/1",
      artAddress: await instance3.getAddress(),
      tokenId: tokenId,
      artist: owner.address,
      receiver: addr2.address,
      royalties: { royaltyBPS: 500, royaltyRecipient: owner.address },
      maxSupply: maxSupply,
      mintFee: mintFee,
      startTime: startTime,
      endTime: endTime,
      numberMinted: 0,
      soulBounded: false
    });
    
    // Call createArtFromFactory through the mock factory
    await mockFactory.createArt(await instance3.getAddress(), artId);
    
    // Now test claimFromFactory
    // Set up the rewards mock to record the chainSync parameter
    await mockRewards.setRecordChainSync(true);
    
    // Call claimFromFactory through the mock factory
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "https://example.com/image.png";
    
    await mockFactory.claim(
      await instance3.getAddress(),
      artId,
      owner.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      quantity,
      data,
      imageURI,
      { value: mintFee }
    );
    
    // Check what chainSync value was recorded
    const recordedChainSync = await mockRewards.lastChainSync();
    
    console.log("Chain ID:", chainId.toString());
    console.log("Cred Chain ID:", chainId.toString());
    console.log("Recorded chainSync:", recordedChainSync);
    console.log("Expected chainSync (original):", true);
    console.log("Expected chainSync (mutant):", false);
    
    // The original code would pass chainSync = true (credChainId == block.chainid)
    // The mutant would pass chainSync = false (credChainId == block.chainid - 1)
    // Since credChainId equals chainId, the original gives true, mutant gives false
    
    // Verify the correct behavior
    expect(recordedChainSync).to.equal(true);
    
    console.log("Test completed - mutation detection: mutant would produce chainSync=false instead of true");
  });
});