import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m61271914", function () {
  it("should detect missing return in getDrugsSinceLastCollect by checking getMyDrugs returns non-zero after time passes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract by seeding the market
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("10") });

    // addr1 gets free kilos to have some production rate
    await instance.connect(addr1).getFreeKilo();

    // Wait some time so that drugs are produced
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);

    // Call getMyDrugs which internally calls getDrugsSinceLastCollect
    // If the mutant is present, it will return 0 because the return statement is missing
    // If the original contract is present, it will return a positive value
    const drugs = await instance.connect(addr1).getMyDrugs();
    expect(drugs).to.be.gt(0, "getMyDrugs should return positive drugs after time passes");
  });
});