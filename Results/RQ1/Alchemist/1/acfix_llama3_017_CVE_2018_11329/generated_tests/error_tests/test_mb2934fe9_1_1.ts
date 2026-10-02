import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test", function () {
  it("should detect mutant mb2934fe9 by checking getMyKilo returns correct value after getFreeKilo", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("1");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("10") });

    // Call getFreeKilo to set Kilos[addr1] = 300
    await instance.connect(addr1).getFreeKilo();

    // Call getMyKilo and verify it returns 300
    const myKilo = await instance.connect(addr1).getMyKilo();
    expect(myKilo).to.equal(300);
  });
});