import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when setOwner is called by the owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the owner account and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // Decode the return value from the transaction receipt
    const iface = new ethers.Interface(Factory.interface.formatJson());
    const decoded = iface.parseTransaction({ data: tx.data });
    const result = iface.decodeFunctionResult(decoded!.name, receipt!.logs[0]?.data || "0x");

    // Assert that the function returned true
    expect(result[0]).to.equal(true);
  });
});