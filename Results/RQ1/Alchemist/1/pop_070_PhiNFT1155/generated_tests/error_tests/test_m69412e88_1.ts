import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m69412e88", function () {
  it("should revert when msg.value is less than artFee in createArtFromFactory", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT = await PhiNFT1155.deploy();
    await phiNFT.waitForDeployment();
    
    // Deploy a mock PhiFactory for testing
    // We need to deploy a minimal PhiFactory that returns a non-zero artCreateFee
    const PhiFactory = await ethers.getContractFactory("IPhiFactory");
    
    // Since we can't deploy an interface, we'll deploy a simple mock contract
    const mockFactoryFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await mockFactoryFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize PhiNFT1155
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDestination = addr1.address;
    
    await phiNFT.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );
    
    // Set the phiFactoryContract address (this is set during initialization)
    // We need to deploy and initialize properly
    
    // Alternative approach: deploy a proper mock that implements IPhiFactory
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory2 = await MockFactory.deploy();
    await mockFactory2.waitForDeployment();
    
    // Re-deploy PhiNFT1155 with a different approach
    const PhiNFT1155New = await ethers.getContractFactory("PhiNFT1155");
    const phiNFT2 = await PhiNFT1155New.deploy();
    await phiNFT2.waitForDeployment();
    
    // Initialize with the mock factory as msg.sender
    // The initialize function sets msg.sender as phiFactoryContract
    await phiNFT2.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );
    
    // Get the artCreateFee from the mock factory
    const artFee = await mockFactory2.artCreateFee();
    
    // Set the protocolFeeDestination to receive the fee
    const protocolFeeDest = await phiNFT2.protocolFeeDestination();
    
    // Fund the contract with some ETH for the test
    await owner.sendTransaction({
      to: await phiNFT2.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Call createArtFromFactory with msg.value less than artFee
    // This should revert in the original due to underflow in the > 0 check
    // The mutant changes > to <, so it might not revert
    
    const artId = 1;
    const insufficientValue = ethers.parseEther("0.1"); // Less than artFee
    
    // We need to call from the phiFactoryContract address
    const phiFactoryAddress = await phiNFT2.phiFactoryContract();
    
    await expect(
      phiNFT2.connect(await ethers.getImpersonatedSigner(phiFactoryAddress))
        .createArtFromFactory(artId, { value: insufficientValue })
    ).to.be.reverted;
  });
});

// Helper contract for testing
contract("MockPhiFactory", function() {
  this.artCreateFee = ethers.parseEther("1");
  this.protocolFeeDestination = ethers.ZeroAddress;
  
  function artData(uint256) external pure returns (IPhiFactory.ArtData memory) {
    return IPhiFactory.ArtData({
      credId: 0,
      credCreator: address(0),
      credChainId: 0,
      verificationType: "",
      uri: "",
      artAddress: address(0),
      tokenId: 0,
      artist: address(0),
      receiver: address(0),
      royalties: ICreatorRoyaltiesControl.RoyaltyConfiguration(0, address(0)),
      maxSupply: 0,
      mintFee: 0,
      startTime: 0,
      endTime: 0,
      numberMinted: 0,
      soulBounded: false
    });
  }
  
  function protocolFeeDestination() external view returns (address) {
    return this.protocolFeeDestination;
  }
});