import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is called with valid parameters (mutant returns false instead)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the AirDropContract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as the contract_address parameter
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Fund owner with tokens and approve the AirDropContract to transfer from owner
    const amount = ethers.parseEther("10");
    await token.mint(owner.address, amount);
    await token.connect(owner).approve(await instance.getAddress(), amount);

    // Call transfer with valid parameters
    const tos = [addr1.address];
    const vs = [amount];

    // The original returns true, the mutant returns false (default bool value)
    const result = await instance.transfer(await token.getAddress(), tos, vs);

    // Assert that the return value is true - this will pass on original, fail on mutant
    expect(result).to.equal(true);
  });
});