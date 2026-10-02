import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant killing test - off-by-one in loop", function () {
  it("should revert when accessing out-of-bounds array index due to <= instead of <", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare arrays with known length (e.g., 2 elements)
    const recipients = [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002"
    ];
    const values = [1, 2]; // values to be multiplied by 1e18

    // Call transfer from the authorized address (from address in contract)
    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // The original would succeed, mutant should revert due to out-of-bounds access
    // when i reaches _tos.length (2) and tries to access _tos[2] and v[2]
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});