import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when owner calls setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner as the owner and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();

    // Decode the return value from the transaction receipt
    const iface = new ethers.Interface(Factory.interface.fragments);
    const decodedLogs = receipt.logs.map(log => {
      try {
        return iface.parseLog({ topics: [...log.topics], data: log.data });
      } catch (e) {
        return null;
      }
    });

    // For a function call, we can get the return value from the decoded data
    // Since setOwner returns bool, we check the transaction's decoded return value
    const result = await instance.setOwner.staticCall(addr1.address);
    expect(result).to.equal(true);
  });
});