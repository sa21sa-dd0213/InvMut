import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m7cc062c3", function () {
  it("should return true when transfer is successful (mutant removes return true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const name = "TestToken";
    const symbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // Perform a transfer that should succeed
    const tx = await instance.connect(owner).transfer(addr1.address, 100);
    await tx.wait();

    // In the original contract, transfer returns true.
    // In the mutant, return true; is removed, so the transaction will still succeed
    // but the function will not return a boolean value.
    // By checking the return value of the function call, we can detect the mutant.
    // We need to get the return value from the transaction response.
    const returnValue = await instance.connect(owner).callStatic.transfer(addr1.address, 100);
    expect(returnValue).to.equal(true);
  });
});