import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when setOwner is called by admin and check the return value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // Decode the return value from the transaction logs
    const iface = new ethers.Interface(Factory.interface.format(true) as any[]);
    const decoded = iface.parseLog({
      topics: receipt!.logs[0].topics as string[],
      data: receipt!.logs[0].data
    });

    // The function should return true, but the mutant removes the return statement
    // This will cause the transaction to not emit any event or return data,
    // so attempting to decode will fail or return undefined
    expect(decoded).to.not.be.undefined;
    expect(decoded?.args[0]).to.equal(true);
  });
});