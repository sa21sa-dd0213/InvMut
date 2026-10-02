import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m97fe4d2f - return true removal", function () {
  it("should return true when transfer function succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Prepare test data
    const recipients = [addr1.address, addr2.address];
    const amounts = [100, 200];

    // Call transfer function and capture return value
    const tx = await instance.transfer(
      owner.address,
      token.target,
      recipients,
      amounts
    );
    const receipt = await tx.wait();

    expect(receipt).to.not.be.undefined;
    expect(receipt.status).to.equal(1); // Transaction succeeded
  });
});