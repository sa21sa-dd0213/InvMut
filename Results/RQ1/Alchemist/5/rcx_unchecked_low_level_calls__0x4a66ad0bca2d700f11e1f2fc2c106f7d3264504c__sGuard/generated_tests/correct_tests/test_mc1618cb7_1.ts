import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mc1618cb7 test", function () {
  it("should kill mutant by checking from address is hardcoded address not address(this)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The hardcoded address from the original contract
    const hardcodedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Get the current from address from the contract
    const fromAddress = await instance.from();
    
    // In the original contract, from should equal the hardcoded address
    // In the mutant, from will equal address(this) (the contract's own address)
    // So we assert that from is NOT equal to the contract's own address
    expect(fromAddress).to.not.equal(await instance.getAddress());
    
    // Additionally, verify the from address matches the expected hardcoded value
    expect(fromAddress).to.equal(hardcodedAddress);
  });
});