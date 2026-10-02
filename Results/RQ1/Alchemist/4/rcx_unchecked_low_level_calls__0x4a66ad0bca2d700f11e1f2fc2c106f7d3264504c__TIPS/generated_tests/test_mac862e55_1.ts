import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mac862e55 - from address zero", function () {
  it("should detect that from address is zero instead of original address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments as per original EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the from address is the original expected address
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const fromAddress = await instance.from();
    
    // The mutant changes from to address(0), so this assertion should fail on the mutant
    expect(fromAddress).to.equal(originalFromAddress);
  });
});