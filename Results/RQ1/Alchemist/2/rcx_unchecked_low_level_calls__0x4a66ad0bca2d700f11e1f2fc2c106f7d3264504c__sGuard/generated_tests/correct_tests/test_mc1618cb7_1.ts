import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mc1618cb7 test", function () {
  it("should detect mutant by verifying from address equals original hardcoded value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract has from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // The mutant changes it to address(this)
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const contractAddress = await instance.getAddress();
    
    const fromVariable = await instance.from();
    
    // On original: from should equal originalFromAddress
    // On mutant: from should equal contractAddress (address(this))
    expect(fromVariable).to.equal(originalFromAddress);
    expect(fromVariable).to.not.equal(contractAddress);
  });
});