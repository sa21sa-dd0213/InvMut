import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - mb2934fe9", function () {
  it("should kill the mutant by verifying getMyKilo returns STARTING_KILOS after getFreeKilo", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedAmount = ethers.parseEther("1");
    await instance.connect(addr1).seedMarket(100, { value: seedAmount });

    // Call getFreeKilo() to set addr1's Kilos to STARTING_KILOS (300)
    await instance.connect(addr1).getFreeKilo();

    // Verify getMyKilo() returns 300 (STARTING_KILOS)
    // The mutant returns 0 instead, so this assertion will fail on the mutant
    const myKilos = await instance.connect(addr1).getMyKilo();
    expect(myKilos).to.equal(300);
  });
});