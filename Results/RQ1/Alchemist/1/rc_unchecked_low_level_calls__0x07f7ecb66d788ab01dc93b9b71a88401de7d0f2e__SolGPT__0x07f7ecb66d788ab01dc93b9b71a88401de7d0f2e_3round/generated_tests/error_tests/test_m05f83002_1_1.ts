import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m05f83002", function () {
  it("should detect mutant that sets whale to address(this) instead of whaleAddress", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a specific whale address (addr2)
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr2.address, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Get initial balance of the contract and the whale address
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialWhaleBalance = await ethers.provider.getBalance(addr2.address);
    
    // addr1 donates 1 ether
    const donateAmount = ethers.parseEther("1");
    await (await instance.connect(addr1).donate({ value: donateAmount })).wait();
    
    // Check contract balance - in original, it should decrease by donateAmount
    // In mutant (whale = address(this)), balance stays the same
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    const finalWhaleBalance = await ethers.provider.getBalance(addr2.address);
    
    // In the original contract, the whale (addr2) receives the donation
    // In the mutant, the whale is the contract itself, so addr2 receives nothing
    expect(finalWhaleBalance).to.equal(initialWhaleBalance + donateAmount);
    
    // Also verify contract balance decreased by the donation amount
    expect(finalContractBalance).to.equal(initialContractBalance - donateAmount);
  });
});