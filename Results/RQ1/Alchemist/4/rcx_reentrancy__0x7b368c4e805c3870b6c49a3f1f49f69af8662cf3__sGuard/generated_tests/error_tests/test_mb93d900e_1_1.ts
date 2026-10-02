import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mb93d900e test", function () {
  it("should kill mutant by showing Collect fails when balance > MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Deposit more than MinSum (MinSum = 1 ether) into addr1's account
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Attempt to collect an amount <= balance (e.g., 1 ether) - should succeed on original but fail on mutant
    const collectAmount = ethers.parseEther("1");

    // On the original contract this would succeed because balance (2) >= MinSum (1)
    // On the mutant it should revert because balance (2) != MinSum (1)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});