import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m6f99dee6 - claimDefaulted return values", function () {
    let coolerFactory: any;
    let cooler: any;
    let owner: any;
    let lender: any;
    let collateralToken: any;
    let debtToken: any;

    beforeEach(async function () {
        [owner, lender] = await ethers.getSigners();

        // Deploy mock ERC20 tokens
        const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
        collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
        debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
        await collateralToken.waitForDeployment();
        await debtToken.waitForDeployment();

        // Deploy CoolerFactory (which deploys Cooler implementation)
        const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
        coolerFactory = await CoolerFactoryFactory.deploy();
        await coolerFactory.waitForDeployment();

        // Mint tokens for owner and lender
        await collateralToken.mint(owner.address, ethers.parseEther("1000"));
        await debtToken.mint(lender.address, ethers.parseEther("1000"));

        // Generate a cooler for owner
        await coolerFactory.connect(owner).generateCooler(
            await collateralToken.getAddress(),
            await debtToken.getAddress()
        );

        // Get the cooler address
        const coolerAddress = await coolerFactory.coolersFor(
            await collateralToken.getAddress(),
            await debtToken.getAddress(),
            0
        );
        cooler = await ethers.getContractAt("Cooler", coolerAddress);
    });

    it("should return correct values when calling claimDefaulted on a defaulted loan", async function () {
        // Setup: Create a loan request and clear it
        const amount = ethers.parseEther("100");
        const interest = ethers.parseEther("10"); // 10% interest
        const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
        const duration = 86400; // 1 day

        // Owner requests a loan
        await collateralToken.connect(owner).approve(await cooler.getAddress(), ethers.parseEther("200"));
        await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

        // Lender clears the request
        await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
        await cooler.connect(lender).clearRequest(0, false, false);

        // Fast forward past expiry to default the loan
        await ethers.provider.send("evm_increaseTime", [duration + 1]);
        await ethers.provider.send("evm_mine", []);

        // Get loan details before claiming default
        const loanBefore = await cooler.getLoan(0);
        const blockBefore = await ethers.provider.getBlock("latest");
        const expectedTimeDiff = blockBefore!.timestamp - Number(loanBefore.expiry);

        // Call claimDefaulted and capture return values
        const tx = await cooler.connect(lender).claimDefaulted(0);
        const receipt = await tx.wait();

        // For ethers v6, decode the return values from the transaction
        const iface = cooler.interface;
        const decodedReturn = iface.decodeFunctionResult("claimDefaulted", receipt.logs[0].data);

        // Assert return values
        expect(decodedReturn[0]).to.equal(loanBefore.amount);
        expect(decodedReturn[1]).to.equal(loanBefore.collateral);
        expect(decodedReturn[2]).to.equal(expectedTimeDiff);
    });

    it("should revert when calling claimDefaulted on a non-defaulted loan", async function () {
        // Setup: Create a loan request and clear it
        const amount = ethers.parseEther("100");
        const interest = ethers.parseEther("10");
        const loanToCollateral = ethers.parseEther("2");
        const duration = 86400;

        await collateralToken.connect(owner).approve(await cooler.getAddress(), ethers.parseEther("200"));
        await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
        await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
        await cooler.connect(lender).clearRequest(0, false, false);

        // Try to claim default before expiry - should revert
        await expect(
            cooler.connect(lender).claimDefaulted(0)
        ).to.be.revertedWithCustomError(cooler, "NoDefault");
    });
});

// Mock ERC20 contract for testing
contract ERC20Mock {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}