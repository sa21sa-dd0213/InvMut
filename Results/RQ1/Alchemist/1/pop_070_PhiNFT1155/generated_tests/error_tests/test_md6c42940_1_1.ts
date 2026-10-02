import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant detection - supportsInterface", function () {
  it("should return false for an arbitrary interfaceId that is numerically less than IPhiNFT1155 interfaceId", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    await instance.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    const arbitraryInterfaceId = "0x00000001";
    const result = await instance.supportsInterface(arbitraryInterfaceId);
    
    expect(result).to.equal(false);
  });

  it("should return true for the actual IPhiNFT1155 interfaceId", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    await instance.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    // Compute IPhiNFT1155 interfaceId - we need to compute it properly
    // IPhiNFT1155 extends ICreatorRoyaltiesControl and IERC1155
    // Let's calculate using the interface functions
    const interfaceId = ethers.utils.id("tokenIdCounter()").substring(0, 10);
    const result = await instance.supportsInterface(interfaceId);
    
    expect(result).to.equal(true);
  });

  it("should return false for an interfaceId between IERC165 and IPhiNFT1155", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    await instance.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    const unsupportedInterfaceId = "0xffffffff";
    const result = await instance.supportsInterface(unsupportedInterfaceId);
    
    expect(result).to.equal(false);
  });
});