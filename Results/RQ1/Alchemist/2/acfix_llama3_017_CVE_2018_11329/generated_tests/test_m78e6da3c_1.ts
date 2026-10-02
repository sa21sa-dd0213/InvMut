import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - getDrugsSinceLastCollect", function () {
  it("should detect mutant using block.prevrandao instead of block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Seed the market first to initialize
    const seedDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("1") });
    
    // Get free kilos for addr1 (gives them STARTING_KILOS = 300)
    await instance.connect(addr1).getFreeKilo();
    
    // Record the timestamp right after getFreeKilo sets lastCollect
    const blockBefore = await ethers.provider.getBlock("latest");
    const lastCollectTime = blockBefore.timestamp;
    
    // Wait for some time to pass (simulate time passing)
    await ethers.provider.send("evm_increaseTime", [100]); // increase by 100 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Get the current block to check prevrandao vs timestamp
    const currentBlock = await ethers.provider.getBlock("latest");
    
    // Now call getDrugsSinceLastCollect for addr1
    // Expected behavior with original: secondsPassed = min(86400, 100) = 100
    // Expected drugs = 100 * 300 = 30000
    const drugsSinceLast = await instance.connect(addr1).getDrugsSinceLastCollect(addr1.address);
    
    // With the mutant using prevrandao, the result will likely be different
    // prevrandao is a random value, not related to elapsed time
    // If prevrandao < lastCollectTime, the SafeMath.sub would revert
    // If it doesn't revert, the value won't equal the expected 30000
    
    // The expected value with original code would be 30000 (100 seconds * 300 kilos)
    const expectedDrugs = BigInt(300 * 100); // 300 kilos * 100 seconds
    
    // Assert that we got the expected value based on timestamp
    // If mutant is present, this will either revert or return wrong value
    expect(drugsSinceLast).to.equal(expectedDrugs);
    
    // Additionally, verify the total drugs using getMyDrugs which calls getDrugsSinceLastCollect
    const myDrugs = await instance.connect(addr1).getMyDrugs();
    // claimedDrugs is 0, so myDrugs should equal drugsSinceLast
    expect(myDrugs).to.equal(drugsSinceLast);
  });
});