import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m7cd2aab9 test", function () {
  it("should detect mutant that changes loop condition from < to > in setGoverned", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock DAO that returns a valid flash governor address
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Get the addresses to be governed
    const addressesToGovern = [addr1.address, addr2.address];
    const boolsToSet = [true, true];

    // Call setGoverned with the array of addresses
    await instance.setGoverned(addressesToGovern, boolsToSet);

    // Verify that the addresses were actually governed
    // On the original contract, this should return true
    // On the mutant (with > instead of <), the loop never executes, so governed mapping remains false
    const isAddr1Governed = await instance.governed(addr1.address);
    const isAddr2Governed = await instance.governed(addr2.address);

    expect(isAddr1Governed).to.equal(true);
    expect(isAddr2Governed).to.equal(true);
  });
});