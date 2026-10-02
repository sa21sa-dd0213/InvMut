import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m5f577d01 - supportsInterface", function () {
  it("should return true for ERC1155 interface ID, detecting mutant that removes ERC1155Upgradeable.supportsInterface check", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // ERC1155 interface ID: 0xd9b67a26
    const ERC1155_INTERFACE_ID = "0xd9b67a26";

    // Call supportsInterface with ERC1155 interface ID
    const result = await instance.supportsInterface(ERC1155_INTERFACE_ID);

    // Original contract should return true for ERC1155 interface
    // Mutant removes ERC1155Upgradeable.supportsInterface check, so it would return false
    expect(result).to.equal(true);
  });
});