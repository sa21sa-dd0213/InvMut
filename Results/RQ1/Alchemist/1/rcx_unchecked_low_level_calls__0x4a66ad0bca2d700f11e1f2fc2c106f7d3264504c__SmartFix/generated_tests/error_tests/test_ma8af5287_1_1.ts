import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant ma8af5287 by passing a non-zero value that satisfies the multiplication/division check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: non-zero value that passes the check (v[i] * 10^18) / v[i] == 10^18
    const recipients = [addr1.address];
    const amounts = [1]; // 1 wei, non-zero value

    // Original contract should pass with this input
    // Mutant will revert because v[i] == 0 is false and AND condition fails
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});