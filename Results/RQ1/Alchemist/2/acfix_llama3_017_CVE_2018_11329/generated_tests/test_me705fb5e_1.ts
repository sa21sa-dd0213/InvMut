import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - me705fb5e", function () {
  it("should detect the mutant by verifying referral assignment in collectDrugs", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("100");
    await instance.seedMarket(seedDrugs, { value: ethers.parseEther("10") });
    
    // addr1 gets free kilos first
    await instance.connect(addr1).getFreeKilo();
    
    // addr1 calls collectDrugs with addr2 as referral
    await instance.connect(addr1).collectDrugs(addr2.address);
    
    // Check if referral was properly set
    const referral = await instance.referrals(addr1.address);
    
    // Original contract would set referral to addr2, mutant would leave it as address(0)
    expect(referral).to.equal(addr2.address);
  });
});