import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - collectDrugs referral check", function () {
  it("should kill mutant mb692ee2a by verifying referral recording with a different referrer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Seed the market first to initialize
    await instance.connect(owner).seedMarket(100, { value: ethers.parseEther("1") });
    
    // Give addr1 some kilos via getFreeKilo
    await instance.connect(addr1).getFreeKilo();
    
    // Now addr1 collects drugs with addr2 as referrer (different address)
    await instance.connect(addr1).collectDrugs(addr2.address);
    
    // Check that referral was recorded correctly
    // In the original contract, this should be addr2.address
    // In the mutant, the condition fails and referral stays as address(0)
    const recordedReferral = await instance.referrals(addr1.address);
    expect(recordedReferral).to.equal(addr2.address);
  });
});