import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - m66fc5789", function () {
  it("should kill the mutant by verifying getMyDrugs() returns correct non-zero value after collecting drugs", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // Give addr1 some free kilos so they can produce drugs
    await instance.connect(addr1).getFreeKilo();

    // Fast forward time so that drugs are produced (DRUGS_TO_PRODUCE_1KILO = 86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    // Now call collectDrugs to update claimedDrugs and trigger drug production
    await instance.connect(addr1).collectDrugs(ethers.ZeroAddress);

    // Call getMyDrugs() - this should return a non-zero value
    const drugs = await instance.connect(addr1).getMyDrugs();

    // The mutant returns 0 instead of the correct sum, so we expect a non-zero value
    // If the mutant is present, this assertion will fail (killing the mutant)
    expect(drugs).to.be.gt(0);
  });
});