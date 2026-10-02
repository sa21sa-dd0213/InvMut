import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m68f1896c", function () {
  it("should detect mutant that breaks min() function by checking getMyDrugs() after time passes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("1") });

    // Give addr1 some free kilos to start
    await instance.connect(addr1).getFreeKilo();

    // Record the initial claimedDrugs and lastCollect time
    const initialClaimed = await instance.claimedDrugs(addr1.address);
    const initialLastCollect = await instance.lastCollect(addr1.address);

    // Wait for some time to pass (e.g., 10 seconds)
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine");

    // Call getMyDrugs() - this should include time-based accumulation
    const myDrugs = await instance.connect(addr1).getMyDrugs();

    // Calculate what the expected value should be
    // expected = initialClaimed + (secondsPassed * Kilos[addr1])
    // where secondsPassed = min(86400, 10) = 10
    const kilos = await instance.getMyKilo();
    const expectedDrugs = initialClaimed + (10n * kilos);

    // The mutant will return just initialClaimed (0 from min returning 0)
    // The original should return initialClaimed + (10 * kilos)
    // If mutant is present, myDrugs will equal initialClaimed (no time accumulation)
    // If original is present, myDrugs will be larger
    expect(myDrugs).to.be.gt(initialClaimed);
    expect(myDrugs).to.equal(expectedDrugs);
  });
});