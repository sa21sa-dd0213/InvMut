import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test - safeTransferFrom soulbound check", function () {
  it("should revert when transferring a soulbound token from a non-zero address (original behavior), but mutant incorrectly allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (no constructor args needed since it uses _disableInitializers)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a mock PhiFactory to interact with
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy(instanceAddress);
    await mockFactory.waitForDeployment();

    // Initialize the PhiNFT1155 contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );

    // Set the phiFactoryContract address on the instance
    // Deploy a helper to set phiFactoryContract
    const HelperFactory = await ethers.getContractFactory("PhiNFT1155Helper");
    const helper = await HelperFactory.deploy();
    await helper.waitForDeployment();
    
    // Set the factory address via the helper
    await helper.setPhiFactory(instanceAddress, mockFactory.target);

    // Create art data for a soulbound token
    const tokenId = 1;
    const quantity = 1;

    // Mint token to addr1 via factory (simulated)
    await mockFactory.mintToken(
      instanceAddress,
      addr1.address,
      tokenId,
      quantity,
      "",
      ethers.ZeroHash
    );

    // Verify addr1 has the token
    expect(await instance.balanceOf(addr1.address, tokenId)).to.equal(1);

    // Try to transfer the soulbound token from addr1 to addr2
    await expect(
      instance.connect(addr1).safeTransferFrom(
        addr1.address,
        addr2.address,
        tokenId,
        1,
        "0x"
      )
    ).to.be.revertedWith("TokenNotTransferable");
  });
});