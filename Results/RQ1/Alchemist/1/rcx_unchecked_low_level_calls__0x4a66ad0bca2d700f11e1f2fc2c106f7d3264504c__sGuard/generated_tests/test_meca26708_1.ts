import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant meca26708 test", function () {
  it("should detect that from address changed to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the from address from the contract
    const fromAddress = await instance.from();
    
    // The original contract has from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // The mutant has from = address(0)
    // We expect the original address, not address(0)
    expect(fromAddress).to.equal("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
  });
});