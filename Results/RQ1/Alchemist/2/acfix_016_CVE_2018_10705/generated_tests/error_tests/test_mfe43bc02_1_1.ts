import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant mfe43bc02 test", function () {
  it("should return true when owner calls setOwner (mutant returns false)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the owner account and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // The original returns true, the mutant returns false
    // Use the decoded return value from the transaction
    const iface = new ethers.Interface(Factory.interface.format(true));
    const decoded = iface.decodeFunctionResult("setOwner", receipt.logs.length === 0 ? "0x" : receipt.logs[0].data);

    // For ethers v6, we can also use the function directly to get the return value
    const returnValue = await instance.connect(owner).setOwner.staticCall(addr1.address);

    expect(returnValue).to.equal(true);
  });
});