import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mfe43bc02 by checking return value of setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from owner and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // The original contract returns true, the mutant removes the return statement.
    // By decoding the return value from the transaction, we can detect the mutant.
    const iface = new ethers.Interface(Factory.interface.format(true));
    const decoded = iface.parseTransaction({ data: tx.data });
    const returnData = receipt.logs.length > 0 ? receipt.logs[0].data : "0x";

    // For a direct function call, we can also check the result via static call
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);
    expect(result).to.equal(true);
  });
});