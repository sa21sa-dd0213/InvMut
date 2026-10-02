import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m50a44ffe test", function () {
  it("should detect mutant that changed 'from' address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the original 'from' address constant from the contract
    const originalFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Get the current 'from' address from the contract
    const currentFrom = await instance.from();
    
    // If the mutant is present, from() will return the wrong address
    // The test kills the mutant by verifying the from address matches the original
    expect(currentFrom).to.equal(originalFrom);
  });
});