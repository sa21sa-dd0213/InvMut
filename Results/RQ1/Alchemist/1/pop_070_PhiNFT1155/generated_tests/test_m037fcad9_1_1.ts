import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m037fcad9 - supportsInterface", function () {
  it("should return true for IPhiNFT1155 interface ID", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 - constructor takes no arguments based on the contract code
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The IPhiNFT1155 interface ID - calculated from the interface's function selectors
    // This is the ERC-165 interface ID for IPhiNFT1155
    const IPhiNFT1155InterfaceId = "0x7f1b7e5a";
    
    // Call supportsInterface with the IPhiNFT1155 interface ID
    const result = await instance.supportsInterface(IPhiNFT1155InterfaceId);
    
    // The original contract should return true for this interface
    // The mutant that removes this check will return false
    expect(result).to.equal(true);
  });
});