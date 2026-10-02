import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m77c00b67 detection test", function () {
  it("should return true on successful transfer call - kills mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipients = [addr1.address, addr2.address];
    const amounts = [100, 200];

    const tx = await instance.transfer(owner.address, instance.target, recipients, amounts);
    const receipt = await tx.wait();

    // The original contract returns true; the mutant returns false (or reverts)
    // We decode the return value from the transaction receipt
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256[]) returns (bool)"]);
    const decodedData = iface.decodeFunctionResult("transfer", tx.data);

    expect(decodedData[0]).to.equal(true);
  });
});