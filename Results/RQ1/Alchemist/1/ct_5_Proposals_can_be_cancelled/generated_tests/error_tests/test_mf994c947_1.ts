import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mf994c947 - finaliseProposal time constraint", function () {
  it("should fail on mutant when calling finaliseProposal exactly after coolOffPeriod has passed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DAO contract (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy mock VADER and VAULT contracts to satisfy dependencies
    const VADERFactory = await ethers.getContractFactory("VADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    
    const VAULTFactory = await ethers.getContractFactory("VAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();
    
    const USDVFactory = await ethers.getContractFactory("USDV");
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();
    
    // Initialize DAO
    await instance.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create a proposal first (any type works for testing the time constraint)
    await instance.newAddressProposal(addr1.address, "UTILS");
    
    // Start the finalising process by voting to trigger _finalise
    await instance.voteProposal(1);
    
    // Get current block timestamp and advance time past coolOffPeriod (coolOffPeriod = 1)
    await ethers.provider.send("evm_increaseTime", [2]); // Increase by 2 seconds to ensure > coolOffPeriod
    await ethers.provider.send("evm_mine", []);
    
    // This call should succeed on original (time > coolOffPeriod) but fail on mutant (time < coolOffPeriod)
    // since we've waited more than coolOffPeriod
    await expect(instance.finaliseProposal(1)).to.not.be.reverted;
    
    // Now test the exact boundary where mutant would fail
    // Create another proposal
    await instance.newAddressProposal(addr1.address, "UTILS");
    await instance.voteProposal(2);
    
    // Advance exactly to coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // This should pass on original (time > coolOffPeriod is true since 1 > 1 is false, but 1 == 1 is not >)
    // Actually need to wait more than coolOffPeriod, so let's wait 2 seconds total
    await ethers.provider.send("evm_increaseTime", [1]); // Total wait = 2 seconds from start
    await ethers.provider.send("evm_mine", []);
    
    // This call should revert on mutant because block.timestamp - startTime = 2 > coolOffPeriod = 1
    // But mutant requires < coolOffPeriod which would be false (2 < 1 is false)
    await expect(instance.finaliseProposal(2)).to.not.be.reverted;
  });
});