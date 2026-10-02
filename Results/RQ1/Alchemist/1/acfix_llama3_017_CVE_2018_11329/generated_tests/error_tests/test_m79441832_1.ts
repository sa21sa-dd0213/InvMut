import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m79441832 - min function", function () {
  it("should detect the mutant by calling getDrugsSinceLastCollect when secondsPassed equals DRUGS_TO_PRODUCE_1KILO", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Get free kilos for addr1 to have some kilos producing drugs
    await instance.connect(addr1).getFreeKilo();
    
    // Get the DRUGS_TO_PRODUCE_1KILO value
    const drugsToProduce = await instance.DRUGS_TO_PRODUCE_1KILO();
    
    // Get the current timestamp from the blockchain
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    
    // Calculate the timestamp that would make secondsPassed exactly equal to DRUGS_TO_PRODUCE_1KILO
    const targetTimestamp = timestampBefore + Number(drugsToProduce);
    
    // Mine a block at exactly that timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [targetTimestamp]);
    await ethers.provider.send("evm_mine", []);
    
    // Now call getDrugsSinceLastCollect for addr1
    // The secondsPassed will be exactly DRUGS_TO_PRODUCE_1KILO
    const drugsSinceLastCollect = await instance.connect(addr1).getDrugsSinceLastCollect(addr1.address);
    
    // With original min function (a < b): when a == b, returns b (DRUGS_TO_PRODUCE_1KILO)
    // With mutant min function (a <= b): when a == b, returns a (DRUGS_TO_PRODUCE_1KILO)
    // Both return the same value when a == b, so this won't detect it
    
    // Actually, the key difference is when a > b: original returns b, mutant returns b (same)
    // When a < b: original returns a, mutant returns a (same)
    // These are functionally identical for all inputs
    
    // Let's verify by checking the actual calculation
    const kilos = await instance.Kilos(addr1.address);
    const expectedDrugs = Number(drugsToProduce) * Number(kilos);
    
    // This assertion should pass on both original and mutant
    expect(drugsSinceLastCollect).to.equal(expectedDrugs);
    
    // The mutant cannot be killed as it's functionally equivalent
    // This test demonstrates the behavior is identical
  });
});