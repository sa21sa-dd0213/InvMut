import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m77c00b67 by expecting return value true from transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data for transfer
    const from = addr1.address;
    const caddress = addr2.address;
    const tos = [addr2.address];
    const values = [ethers.parseEther("1")];

    // Call transfer and expect it to return true
    const tx = await instance.transfer(from, caddress, tos, values);
    const receipt = await tx.wait();

    // The mutated contract without return true will either revert or return nothing,
    // so expecting a successful transaction with a return value of true kills the mutant
    expect(receipt).to.not.be.null;
    expect(await tx).to.be.true;
  });
});