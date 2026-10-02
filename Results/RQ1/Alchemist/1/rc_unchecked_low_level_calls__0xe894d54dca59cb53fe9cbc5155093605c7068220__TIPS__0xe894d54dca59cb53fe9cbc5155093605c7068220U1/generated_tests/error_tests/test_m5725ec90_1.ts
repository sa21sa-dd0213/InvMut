import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - m5725ec90", function () {
  it("should return true when transfer succeeds, killing the mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airDrop contract to spend them
    const mintAmount = ethers.parseUnits("1000", 18);
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);

    // Prepare transfer parameters
    const tos = [addr1.address, addr2.address];
    const value = ethers.parseUnits("10", 18);
    const decimals = 18;

    // Call transfer function and expect it to return true
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      tos,
      value,
      decimals
    );
    const receipt = await tx.wait();

    // Get the return value from the transaction
    // In ethers v6, we need to decode the return data
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256,uint256) returns (bool)"]);
    const decodedData = iface.decodeFunctionResult("transfer", receipt.logs[0].data);
    const result = decodedData[0];

    // Assert the function returned true (which the mutant fails to do)
    expect(result).to.be.true;
  });
});