import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - mb1320571", function () {
  it("should revert when non-PhiFactory address calls onlyPhiFactory-protected function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments (disable initializers)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock PhiFactory contract to set as phiFactoryContract
    // We need to deploy a minimal contract that implements the required interface
    const MockFactory = await ethers.getContractFactory("IPhiFactory");
    
    // Since we need a real PhiFactory, we'll deploy a simple contract that mimics it
    const mockFactoryArtifact = {
      abi: [
        "function protocolFeeDestination() view returns (address)",
        "function artCreateFee() view returns (uint256)",
        "function phiRewardsAddress() view returns (address)",
        "function artData(uint256) view returns (tuple(address artist, address receiver, uint256 credId, uint256 credChainId, string verificationType, string uri, address artAddress, uint256 tokenId, address artist_, address receiver_, uint256 maxSupply, uint256 mintFee, uint256 startTime, uint256 endTime, uint256 numberMinted, bool soulBounded))",
        "function getTokenURI(uint256) view returns (string)",
        "function contractURI(address) view returns (string)"
      ],
      bytecode: "0x"
    };
    
    // Deploy a simple mock that returns required values
    const MockFactoryContract = await ethers.getContractFactory("MockPhiFactory");
    
    // Try to initialize the PhiNFT1155 contract to set the phiFactoryContract
    // First check if initialized
    try {
      await instance.initialize(
        1, // credChainId
        1, // credId
        "test", // verificationType
        owner.address // protocolFeeDestination
      );
    } catch (e) {
      // Contract may already be initialized or need different setup
    }
    
    // Now try to call createArtFromFactory from an unauthorized address (not the phiFactoryContract)
    // This should revert with NotPhiFactory on the original but pass silently on the mutant
    await expect(
      instance.connect(addr1).createArtFromFactory(1, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("NotPhiFactory");
    
    // Also test claimFromFactory which is also protected by onlyPhiFactory
    await expect(
      instance.connect(addr2).claimFromFactory(
        1, // artId
        addr2.address, // minter
        ethers.ZeroAddress, // ref
        ethers.ZeroAddress, // verifier
        1, // quantity
        ethers.ZeroHash, // data
        "" // imageURI
      )
    ).to.be.revertedWith("NotPhiFactory");
  });
});