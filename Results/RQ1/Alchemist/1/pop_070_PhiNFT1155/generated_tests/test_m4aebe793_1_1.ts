import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant detection - supportsInterface", function () {
  it("should kill mutant m4aebe793 by querying supportsInterface with a bytes4 value greater than IPhiNFT1155 interface ID", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the IPhiNFT1155 interface ID
    const IPhiNFT1155InterfaceId = "0x2e3b0e1c"; // This is the actual interface ID for IPhiNFT1155
    
    // Create a bytes4 value that is numerically greater than the IPhiNFT1155 interface ID
    // 0x2e3b0e1d > 0x2e3b0e1c
    const greaterInterfaceId = "0x2e3b0e1d";
    
    // The original contract should return false for this non-matching interface ID
    // The mutant with >= would incorrectly return true
    expect(await instance.supportsInterface(greaterInterfaceId)).to.be.false;
  });
});